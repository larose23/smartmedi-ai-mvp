import { Appointment, Provider, Patient, TimeSlot } from '@/types/scheduling';

interface SchedulingPreferences {
  urgency: 'high' | 'medium' | 'low';
  preferredSpecialties?: string[];
  preferredProviders?: string[];
  preferredTimeSlots?: TimeSlot[];
  maxWaitTime?: number; // in minutes
}

interface ProviderAvailability {
  provider: Provider;
  availableSlots: TimeSlot[];
  specializationMatch: number; // 0-1 score
  waitTime: number; // in minutes
}

export class SchedulingAlgorithm {
  private static readonly URGENCY_WEIGHTS = {
    high: 1.0,
    medium: 0.7,
    low: 0.4
  };

  private static readonly SPECIALIZATION_MATCH_WEIGHT = 0.4;
  private static readonly WAIT_TIME_WEIGHT = 0.3;
  private static readonly PROVIDER_PREFERENCE_WEIGHT = 0.3;

  /**
   * Calculate optimal appointment slots based on urgency and provider matching
   */
  public static async findOptimalSlots(
    patient: Patient,
    preferences: SchedulingPreferences,
    availableProviders: Provider[],
    availableSlots: TimeSlot[]
  ): Promise<TimeSlot[]> {
    // Filter and score providers based on specialization and availability
    const scoredProviders = await this.scoreProviders(
      availableProviders,
      preferences,
      availableSlots
    );

    // Sort providers by score
    const sortedProviders = scoredProviders.sort((a, b) => b.score - a.score);

    // Get optimal slots for each provider
    const optimalSlots = await this.getOptimalSlots(
      sortedProviders,
      preferences,
      availableSlots
    );

    return optimalSlots;
  }

  /**
   * Score providers based on specialization match and availability
   */
  private static async scoreProviders(
    providers: Provider[],
    preferences: SchedulingPreferences,
    availableSlots: TimeSlot[]
  ): Promise<Array<Provider & { score: number }>> {
    return providers.map(provider => {
      const specializationMatch = this.calculateSpecializationMatch(
        provider,
        preferences
      );

      const waitTime = this.calculateWaitTime(provider, availableSlots);
      const providerPreference = preferences.preferredProviders?.includes(
        provider.id
      )
        ? 1
        : 0;

      const score =
        this.SPECIALIZATION_MATCH_WEIGHT * specializationMatch +
        this.WAIT_TIME_WEIGHT * (1 - waitTime / 100) + // Normalize wait time
        this.PROVIDER_PREFERENCE_WEIGHT * providerPreference;

      return {
        ...provider,
        score
      };
    });
  }

  /**
   * Calculate specialization match score between provider and preferences
   */
  private static calculateSpecializationMatch(
    provider: Provider,
    preferences: SchedulingPreferences
  ): number {
    if (!preferences.preferredSpecialties?.length) return 1;

    const matchingSpecialties = preferences.preferredSpecialties.filter(
      specialty => provider.specialties.includes(specialty)
    );

    return matchingSpecialties.length / preferences.preferredSpecialties.length;
  }

  /**
   * Calculate average wait time for a provider
   */
  private static calculateWaitTime(
    provider: Provider,
    availableSlots: TimeSlot[]
  ): number {
    const providerSlots = availableSlots.filter(
      slot => slot.providerId === provider.id
    );

    if (!providerSlots.length) return Infinity;

    const now = new Date();
    const waitTimes = providerSlots.map(slot => {
      const slotTime = new Date(slot.startTime);
      return slotTime.getTime() - now.getTime();
    });

    return Math.min(...waitTimes) / (1000 * 60); // Convert to minutes
  }

  /**
   * Get optimal slots based on provider scores and preferences
   */
  private static async getOptimalSlots(
    scoredProviders: Array<Provider & { score: number }>,
    preferences: SchedulingPreferences,
    availableSlots: TimeSlot[]
  ): Promise<TimeSlot[]> {
    const urgencyWeight = this.URGENCY_WEIGHTS[preferences.urgency];
    const maxWaitTime = preferences.maxWaitTime || 10080; // Default 1 week

    return scoredProviders
      .flatMap(provider => {
        const providerSlots = availableSlots.filter(
          slot => slot.providerId === provider.id
        );

        return providerSlots.map(slot => ({
          ...slot,
          score:
            provider.score *
            urgencyWeight *
            (1 - this.calculateSlotWaitTime(slot) / maxWaitTime)
        }));
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Return top 5 slots
  }

  /**
   * Calculate wait time for a specific slot
   */
  private static calculateSlotWaitTime(slot: TimeSlot): number {
    const now = new Date();
    const slotTime = new Date(slot.startTime);
    return (slotTime.getTime() - now.getTime()) / (1000 * 60); // Convert to minutes
  }

  /**
   * Validate if a slot is suitable for the patient's urgency level
   */
  public static validateSlotUrgency(
    slot: TimeSlot,
    urgency: 'high' | 'medium' | 'low'
  ): boolean {
    const waitTime = this.calculateSlotWaitTime(slot);
    const maxWaitTimes = {
      high: 24, // 24 hours for high urgency
      medium: 72, // 72 hours for medium urgency
      low: 168 // 1 week for low urgency
    };

    return waitTime <= maxWaitTimes[urgency];
  }

  /**
   * Get provider recommendations based on patient history and preferences
   */
  public static async getProviderRecommendations(
    patient: Patient,
    preferences: SchedulingPreferences,
    availableProviders: Provider[]
  ): Promise<Provider[]> {
    const scoredProviders = await this.scoreProviders(
      availableProviders,
      preferences,
      [] // No slots needed for provider recommendations
    );

    return scoredProviders
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Return top 3 providers
      .map(({ score, ...provider }) => provider);
  }
} 