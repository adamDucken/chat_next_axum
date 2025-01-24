'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"
import { ErrorTitle, SuccessTitle } from './ToastTitles'
import { getRegistrationErrorMessage } from '@/lib/auth_error_handlers'


// Define validation schema
const userSchema = z.object({
  email: z.string(), // .email("Invalid email address"),
  password: z.string(), //.min(1, "Password is required"),
});

// Type inference from schema
type UserFormData = z.infer<typeof userSchema>;

type ApiErrorResponse = {
  error: string;
}

// Component props type
interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  const router = useRouter();
  const { toast } = useToast();

  const validateField = (field: keyof UserFormData, value: string): string | null => {
    try {
      userSchema.shape[field].parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Validation failed";
    }
  };

  const handleInputChange = (field: keyof UserFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setErrors({});

    try {
      const validatedData = userSchema.parse(formData);


      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(JSON.stringify(errorData));

      }

      toast({
        title: <SuccessTitle title='Registration Successful' />,
        description: "Your account has been created. Please login.",
      });

      onSuccess?.();
      router.push('/login');

    } catch (error) {
      if (error instanceof z.ZodError) {
        // here we handle validation errors
        const newErrors: Partial<Record<keyof UserFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof UserFormData] = err.message;
          }
        });
        setErrors(newErrors);

        toast({
          title: <ErrorTitle title='Validation Error' />,
          description: "Please check your input fields.",
        });

      } else {
        // here we check and handle api errors
        const { title, description } = getRegistrationErrorMessage(error);
        toast({
          title: <ErrorTitle title={title} />,
          description,
          duration: 5000,
        });
      }
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create a new account to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p className="text-sm text-red-500" id="email-error">{errors.email}</p>
              )}
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a password"
                value={formData.password}
                onChange={handleInputChange('password')}
                required
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p className="text-sm text-red-500" id="password-error">{errors.password}</p>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/login')}
        >
          Login
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
        >
          Register
        </Button>
      </CardFooter>
    </Card>
  );
}
