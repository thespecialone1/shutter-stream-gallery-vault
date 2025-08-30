import { ReactNode, useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { validateGalleryName, validateClientName, validateDescription, globalRateLimit } from '@/utils/security';
import { logSecurityEvent } from '@/utils/securityHeaders';
import { UseFormReturn } from 'react-hook-form';

interface SecurityEnhancedFormProps {
  children: ReactNode;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  formType: 'gallery' | 'profile' | 'general';
  className?: string;
}

/**
 * Security-enhanced form wrapper with input validation and rate limiting
 */
export const SecurityEnhancedForm = ({ 
  children, 
  form, 
  onSubmit, 
  formType,
  className 
}: SecurityEnhancedFormProps) => {
  
  useEffect(() => {
    // Set up form validation handlers
    const setupValidation = () => {
      const formElement = document.querySelector('form');
      if (!formElement) return;

      formElement.addEventListener('submit', (e) => {
        // Rate limiting check
        const rateLimitKey = `form_${formType}_${Date.now()}`;
        if (!globalRateLimit.checkLimit(rateLimitKey, 10, 60000)) { // 10 submissions per minute
          e.preventDefault();
          logSecurityEvent('form_rate_limit_exceeded', { formType });
          form.setError('root', { 
            type: 'manual', 
            message: 'Too many submissions. Please wait before trying again.' 
          });
          return;
        }
      });
    };

    setupValidation();
  }, [form, formType]);

  const handleSecureSubmit = (data: any) => {
    try {
      // Validate and sanitize form data based on type
      let sanitizedData = { ...data };
      
      if (formType === 'gallery') {
        if (data.name) {
          const nameValidation = validateGalleryName(data.name);
          if (!nameValidation.valid) {
            form.setError('name', { type: 'manual', message: nameValidation.error });
            return;
          }
          sanitizedData.name = nameValidation.sanitized;
        }
        
        if (data.client_name) {
          const clientValidation = validateClientName(data.client_name);
          if (!clientValidation.valid) {
            form.setError('client_name', { type: 'manual', message: clientValidation.error });
            return;
          }
          sanitizedData.client_name = clientValidation.sanitized;
        }
        
        if (data.description) {
          const descValidation = validateDescription(data.description);
          if (!descValidation.valid) {
            form.setError('description', { type: 'manual', message: descValidation.error });
            return;
          }
          sanitizedData.description = descValidation.sanitized;
        }
      }

      // Log successful validation
      logSecurityEvent('form_validation_passed', { formType });
      
      onSubmit(sanitizedData);
    } catch (error) {
      logSecurityEvent('form_validation_error', { formType, error: 'Validation failed' });
      form.setError('root', { 
        type: 'manual', 
        message: 'Form validation failed. Please check your inputs.' 
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSecureSubmit)} className={className}>
        {children}
      </form>
    </Form>
  );
};