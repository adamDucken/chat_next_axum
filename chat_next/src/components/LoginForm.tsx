'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"
import { SuccessTitle, ErrorTitle } from './ToastTitles'
import { getLoginErrorMessage } from '@/lib/auth_error_handlers'


const loginSchema = z.object({
  email: z.string(), // .email("Invalid email address"),
  password: z.string(), //.min(1, "Password is required"),
});

// Type inference from schema
type LoginFormData = z.infer<typeof loginSchema>;

// Component props type
interface LoginFormProps {
  onSuccess?: () => void;
}

type ApiErrorResponse = {
  error: string;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});

  const router = useRouter();
  const { toast } = useToast();

  const validateField = (field: keyof LoginFormData, value: string): string | null => {
    try {
      loginSchema.shape[field].parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Validation failed";
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (
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
      // Validate all fields
      const validatedData = loginSchema.parse(formData);

      const response = await fetch('http://localhost:3001/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Important: Include credentials to allow cookie handling
        credentials: 'include',
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();

      toast({
        title: <SuccessTitle title='Login Successful' />,
        description: "You have been successfully logged in.",
      });

      onSuccess?.();
      router.push('/chat');

    } catch (error) {
      if (error instanceof z.ZodError) {
        // here we handle validation errors
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof LoginFormData] = err.message;
          }
        });
        setErrors(newErrors);

        toast({
          title: <ErrorTitle title='Validation Error' />,
          description: "Please check your input fields.",
        });
      } else {
        // here we check and handle api errors
        const { title, description } = getLoginErrorMessage(error);
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
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
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
                placeholder="Enter your password"
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
          onClick={() => router.push('/register')}
        >
          Register
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
        >
          Login
        </Button>
      </CardFooter>
    </Card>
  );
}
