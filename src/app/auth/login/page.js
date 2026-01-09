'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleWorkspaceRedirect = async () => {
    try {
     
      const workspaceResponse = await fetch('/api/auth/set-initial-workspace', {
        method: 'POST',
      })

      if (workspaceResponse.ok) {
       
        router.push(callbackUrl)
      } else if (workspaceResponse.status === 404) {
       
        toast.info('Please select or create a workspace to continue')
        router.push('/workspaces/select')
      } else {
   
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error setting workspace context:', error)
     
      router.push('/dashboard')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          toast.error('Invalid email or password')
          setErrors({
            email: 'Invalid email or password',
            password: 'Invalid email or password',
          })
        } else {
          toast.error('An error occurred during login')
        }
      } else if (result?.ok) {
        toast.success('Login successful!')

        // Wait for session to be established
        await getSession()

        // Handle workspace context and redirect
        await handleWorkspaceRedirect()

        // Refresh to ensure all contexts are updated
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center  px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16  flex items-center justify-center mx-auto mb-4">
            <img src="/logo-1.svg"/>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Welcome back</h1>
          <p className="text-slate-gray-600 mt-2">Sign in to your Starboard account</p>
        </div>

        <Card className="starboard-card border-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your email and password to access your account</CardDescription>
          </CardHeader>

          <CardContent className="border-none">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`starboard-input ${errors.email ? 'field-error' : ''}`}
                  disabled={isLoading}
                />
                {errors.email && <p className="error-message">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`starboard-input pr-10 ${errors.password ? 'field-error' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500 hover:text-slate-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="error-message">{errors.password}</p>}
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full starboard-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

          
          </CardContent>
        </Card>

         
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-4 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-yellow-800 mb-2">Demo Credentials:</p>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>
                  <strong>Admin:</strong> admin@starboard.com / admin123
                </p>
                <p>
                  <strong>User:</strong> user@starboard.com / user123
                </p>
                <p>
                  <strong>Startup:</strong> startup@example.com / user123
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workspace Info */}
        <div className="mt-4 text-center text-xs text-slate-gray-500">
          <p>After login, you'll be directed to your default workspace</p>
        </div>
      </div>
    </div>
  )
}
function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Welcome back</h1>
          <p className="text-slate-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
