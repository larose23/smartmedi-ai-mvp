import { supabase } from '@/lib/supabase';
import { createClient } from 'fhir.js';
import { HL7Message } from 'hl7';

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  [key: string]: any;
}

export interface HL7MessageConfig {
  messageType: string;
  triggerEvent: string;
  version: string;
}

export class IntegrationService {
  private static fhirClient = createClient({
    baseUrl: process.env.NEXT_PUBLIC_FHIR_SERVER_URL || 'http://localhost:8080/fhir',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Authorization': `Bearer ${process.env.FHIR_API_KEY}`
    }
  });

  // FHIR API Endpoints
  static async createFHIRResource(resource: FHIRResource): Promise<FHIRResource> {
    try {
      this.validateFHIRResource(resource);
      const response = await this.fhirClient.create(resource);
      return response.data;
    } catch (error) {
      console.error('Error creating FHIR resource:', error);
      throw error;
    }
  }

  static async getFHIRResource(resourceType: string, id: string): Promise<FHIRResource> {
    try {
      const response = await this.fhirClient.read({ resourceType, id });
      return response.data;
    } catch (error) {
      console.error('Error getting FHIR resource:', error);
      throw error;
    }
  }

  static async searchFHIRResources(resourceType: string, params: Record<string, any>): Promise<FHIRResource[]> {
    try {
      const response = await this.fhirClient.search({ resourceType, params });
      return response.data.entry?.map(entry => entry.resource) || [];
    } catch (error) {
      console.error('Error searching FHIR resources:', error);
      throw error;
    }
  }

  static async updateFHIRResource(resource: FHIRResource): Promise<FHIRResource> {
    try {
      this.validateFHIRResource(resource);
      const response = await this.fhirClient.update(resource);
      return response.data;
    } catch (error) {
      console.error('Error updating FHIR resource:', error);
      throw error;
    }
  }

  // HL7 Message Processing
  static async processHL7Message(message: string, config: HL7MessageConfig): Promise<void> {
    try {
      const hl7Message = new HL7Message(message);
      
      // Validate message structure
      if (!this.validateHL7Message(hl7Message, config)) {
        throw new Error('Invalid HL7 message structure');
      }

      // Store message in database
      const { error } = await supabase
        .from('hl7_messages')
        .insert({
          message_type: config.messageType,
          trigger_event: config.triggerEvent,
          version: config.version,
          raw_message: message,
          processed: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Process message based on type
      await this.handleHL7Message(hl7Message, config);
    } catch (error) {
      console.error('Error processing HL7 message:', error);
      throw error;
    }
  }

  private static validateHL7Message(message: HL7Message, config: HL7MessageConfig): boolean {
    try {
      // Check MSH segment
      const msh = message.getSegment('MSH');
      if (!msh) return false;

      // Validate message type and trigger event
      const messageType = msh.getField(9);
      const triggerEvent = msh.getField(10);
      const version = msh.getField(12);

      return (
        messageType === config.messageType &&
        triggerEvent === config.triggerEvent &&
        version === config.version
      );
    } catch (error) {
      console.error('Error validating HL7 message:', error);
      return false;
    }
  }

  private static async handleHL7Message(message: HL7Message, config: HL7MessageConfig): Promise<void> {
    // Handle different message types
    switch (config.messageType) {
      case 'ADT':
        await this.handleADTMessage(message);
        break;
      case 'ORU':
        await this.handleORUMessage(message);
        break;
      case 'SIU':
        await this.handleSIUMessage(message);
        break;
      default:
        console.warn(`Unhandled message type: ${config.messageType}`);
    }
  }

  private static async handleADTMessage(message: HL7Message): Promise<void> {
    // Handle ADT (Admission, Discharge, Transfer) messages
    const pid = message.getSegment('PID');
    if (!pid) return;

    // Extract patient information
    const patientId = pid.getField(3);
    const patientName = pid.getField(5);
    const dateOfBirth = pid.getField(7);

    // Create or update patient record
    await this.createFHIRResource({
      resourceType: 'Patient',
      identifier: [{ value: patientId }],
      name: [{ text: patientName }],
      birthDate: dateOfBirth
    });
  }

  private static async handleORUMessage(message: HL7Message): Promise<void> {
    // Handle ORU (Observation Result) messages
    const obr = message.getSegment('OBR');
    const obx = message.getSegment('OBX');
    if (!obr || !obx) return;

    // Extract observation information
    const observationId = obr.getField(3);
    const observationValue = obx.getField(5);
    const observationUnit = obx.getField(6);

    // Create observation record
    await this.createFHIRResource({
      resourceType: 'Observation',
      identifier: [{ value: observationId }],
      valueQuantity: {
        value: parseFloat(observationValue),
        unit: observationUnit
      }
    });
  }

  private static async handleSIUMessage(message: HL7Message): Promise<void> {
    // Handle SIU (Scheduling Information Unsolicited) messages
    const sch = message.getSegment('SCH');
    if (!sch) return;

    // Extract scheduling information
    const appointmentId = sch.getField(1);
    const startTime = sch.getField(5);
    const endTime = sch.getField(6);

    // Create appointment record
    await this.createFHIRResource({
      resourceType: 'Appointment',
      identifier: [{ value: appointmentId }],
      start: startTime,
      end: endTime
    });
  }

  // Secure Data Exchange
  static async encryptData(data: any): Promise<string> {
    try {
      const { data: encryptedData, error } = await supabase.rpc('encrypt_data', {
        data_to_encrypt: JSON.stringify(data)
      });

      if (error) throw error;
      return encryptedData;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  static async decryptData(encryptedData: string): Promise<any> {
    try {
      const { data: decryptedData, error } = await supabase.rpc('decrypt_data', {
        encrypted_data: encryptedData
      });

      if (error) throw error;
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  // Message Acknowledgment
  static async acknowledgeHL7Message(messageId: string, status: 'ACCEPT' | 'ERROR', errorMessage?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('hl7_messages')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', messageId);

      if (error) throw error;

      // Log the acknowledgment
      await supabase
        .from('integration_logs')
        .insert({
          integration_type: 'HL7',
          direction: 'OUTBOUND',
          status: status,
          payload: {
            message_id: messageId,
            status: status,
            error_message: errorMessage
          }
        });
    } catch (error) {
      console.error('Error acknowledging HL7 message:', error);
      throw error;
    }
  }

  // Add validation for FHIR resources
  private static validateFHIRResource(resource: FHIRResource): void {
    if (!resource.resourceType) {
      throw new Error('Missing resourceType in FHIR resource');
    }

    // Add more specific validation based on resource type
    switch (resource.resourceType) {
      case 'Patient':
        this.validatePatientResource(resource);
        break;
      case 'Observation':
        this.validateObservationResource(resource);
        break;
      case 'Appointment':
        this.validateAppointmentResource(resource);
        break;
    }
  }

  private static validatePatientResource(resource: FHIRResource): void {
    if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
      throw new Error('Patient resource must have at least one identifier');
    }
    if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
      throw new Error('Patient resource must have at least one name');
    }
  }

  private static validateObservationResource(resource: FHIRResource): void {
    if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
      throw new Error('Observation resource must have at least one identifier');
    }
    if (!resource.valueQuantity) {
      throw new Error('Observation resource must have a valueQuantity');
    }
  }

  private static validateAppointmentResource(resource: FHIRResource): void {
    if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
      throw new Error('Appointment resource must have at least one identifier');
    }
    if (!resource.start || !resource.end) {
      throw new Error('Appointment resource must have start and end times');
    }
  }
} 