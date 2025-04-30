import { useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setLoading(true);
      await resetPassword(data.email);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm"
        >
          {theme === "dark" ? (
            <i className="ri-sun-line text-xl text-slate-300"></i>
          ) : (
            <i className="ri-moon-line text-xl text-slate-600"></i>
          )}
        </button>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-md text-white">
            <i className="ri-sun-line text-2xl"></i>
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          We'll send you instructions to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {isSubmitted ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success-500">
                <CheckCircle2 className="h-5 w-5" />
                Email Sent
              </CardTitle>
              <CardDescription>
                Password reset instructions have been sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                We've sent an email to <span className="font-medium">{form.getValues().email}</span> with instructions to reset your password.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Please check your inbox and follow the link in the email to complete the password reset process.
              </p>
              <Link href="/auth/login">
                <Button className="w-full">
                  Return to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          className="block w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Sending instructions...
                    </span>
                  ) : (
                    "Send reset instructions"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link href="/auth/login">
                <a className="text-sm font-medium text-primary hover:text-primary-focus">
                  <i className="ri-arrow-left-line mr-1"></i>
                  Back to login
                </a>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
