import { z } from 'zod'

export const requestFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  organization: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  requirement: z.string().trim().min(10, 'Tell us a bit more about what you need (at least 10 characters)'),
  target: z.string().trim().min(1, 'What are you trying to achieve?'),
  expected_output: z.string().trim().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  additional_details: z.string().trim().optional().or(z.literal('')),
})

export type RequestFormValues = z.infer<typeof requestFormSchema>
