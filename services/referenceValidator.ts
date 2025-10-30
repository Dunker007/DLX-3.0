import { Reference, ReferenceType } from '../types';

interface ValidationResult {
    isValid: boolean;
    message?: string;
}

class ReferenceValidator {
    public validate(reference: Reference): ValidationResult {
        switch (reference.type) {
            case ReferenceType.CommitHash:
                return this.validateCommitHash(reference.id);
            case ReferenceType.DVJob:
                return this.validateDVJob(reference.id);
            // Add other cases as needed
            default:
                return { isValid: true };
        }
    }

    private validateCommitHash(id: string): ValidationResult {
        // A simple git SHA-1 regex (short and long)
        const gitShaRegex = /^[0-9a-f]{7,40}$/i;
        if (!gitShaRegex.test(id)) {
            return { isValid: false, message: "Invalid Git commit hash format." };
        }
        // In a real app, you might query a Git service here to check existence.
        return { isValid: true };
    }

    private validateDVJob(id: string): ValidationResult {
        // Example: DV jobs must start with 'dv-job-' followed by a number
        const dvJobRegex = /^dv-job-\d+$/;
        if (!dvJobRegex.test(id)) {
            return { isValid: false, message: "Invalid DV Job ID format. Expected 'dv-job-123'." };
        }
        return { isValid: true };
    }
}

export const referenceValidator = new ReferenceValidator();
