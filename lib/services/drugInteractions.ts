import { Medication } from './medicalHistory';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

export interface DrugInteraction {
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
  references: string[];
}

export class DrugInteractionChecker {
  private static instance: DrugInteractionChecker;
  private interactionDatabase: Map<string, Map<string, DrugInteraction>>;

  private constructor() {
    this.interactionDatabase = new Map();
    this.initializeDatabase();
  }

  public static getInstance(): DrugInteractionChecker {
    if (!DrugInteractionChecker.instance) {
      DrugInteractionChecker.instance = new DrugInteractionChecker();
    }
    return DrugInteractionChecker.instance;
  }

  private initializeDatabase() {
    // TODO: Load from external API or database
    // This is a simplified example
    const interactions = new Map<string, Map<string, DrugInteraction>>();
    
    // Example interaction: Warfarin and Aspirin
    const warfarinInteractions = new Map<string, DrugInteraction>();
    warfarinInteractions.set('aspirin', {
      severity: 'severe',
      description: 'Increased risk of bleeding',
      recommendation: 'Avoid combination. If necessary, monitor INR closely.',
      references: ['Drugs.com', 'Medscape']
    });
    interactions.set('warfarin', warfarinInteractions);

    this.interactionDatabase = interactions;
  }

  async checkInteractions(
    newMedication: Medication,
    existingMedications: Medication[]
  ): Promise<DrugInteraction[]> {
    try {
      const interactions: DrugInteraction[] = [];

      for (const existingMed of existingMedications) {
        const interaction = await this.checkInteraction(newMedication, existingMed);
        if (interaction) {
          interactions.push(interaction);
        }
      }

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'drug_interaction_check',
        {
          newMedicationId: newMedication.id,
          existingMedicationIds: existingMedications.map(m => m.id)
        },
        '127.0.0.1',
        'DrugInteractionChecker',
        true
      );

      return interactions;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'drug_interaction_check_error',
        { error: error.message },
        '127.0.0.1',
        'DrugInteractionChecker'
      );
      throw error;
    }
  }

  private async checkInteraction(
    med1: Medication,
    med2: Medication
  ): Promise<DrugInteraction | null> {
    // Check both directions of interaction
    const interaction1 = this.interactionDatabase.get(med1.name.toLowerCase())?.get(med2.name.toLowerCase());
    const interaction2 = this.interactionDatabase.get(med2.name.toLowerCase())?.get(med1.name.toLowerCase());

    return interaction1 || interaction2 || null;
  }

  async getInteractionDetails(medication1: string, medication2: string): Promise<DrugInteraction | null> {
    try {
      const interaction = this.interactionDatabase.get(medication1.toLowerCase())?.get(medication2.toLowerCase()) ||
                         this.interactionDatabase.get(medication2.toLowerCase())?.get(medication1.toLowerCase());

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'drug_interaction_details',
        { medication1, medication2 },
        '127.0.0.1',
        'DrugInteractionChecker',
        true
      );

      return interaction || null;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'drug_interaction_details_error',
        { error: error.message },
        '127.0.0.1',
        'DrugInteractionChecker'
      );
      throw error;
    }
  }
} 