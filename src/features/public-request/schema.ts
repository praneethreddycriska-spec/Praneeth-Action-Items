import { z } from 'zod'

export const requestFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().optional().or(z.literal('')),
  organization: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  requirement: z.string().trim().min(10, 'Tell us a bit more about what you need (at least 10 characters)'),
  target: z.string().trim().min(1, 'This field is required'),
  expected_output: z.string().trim().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  additional_details: z.string().trim().optional().or(z.literal('')),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional().or(z.literal('')),
  dependencies: z.string().trim().optional().or(z.literal('')),
  important_instructions: z.string().trim().optional().or(z.literal('')),
  reference_links: z.string().trim().optional().or(z.literal('')),
})

export type RequestFormValues = z.infer<typeof requestFormSchema>
