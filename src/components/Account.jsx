import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Wallet from './Wallet';

const Account = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // State to toggle between 'signin' and 'register' views
  const [isSignInView, setIsSignInView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // State for Sign In form data
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  // State for Register form data
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const handleAuthChange = () => {
      const token = localStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    };
    window.addEventListener('authChanged', handleAuthChange);
    return () => window.removeEventListener('authChanged', handleAuthChange);
  }, []);

  // Handle input changes for both forms
  const handleSignInChange = (e) => {
    setSignInData({ ...signInData, [e.target.id]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.id]: e.target.value });
  };

  // Handle Sign In submission
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('https://tron-backend.vercel.app/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signInData),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle non-OK responses (e.g., 401 Unauthorized)
        throw new Error(data.message || 'Sign in failed');
      }
      
      // *** MODIFIED: Store the token in Local Storage ***
      if (data.token) {
        localStorage.setItem('userToken', data.token);
        window.dispatchEvent(new Event('authChanged'));
      }

      // Success handling (e.g., store token, redirect)
      setMessage('Sign in successful! Token stored in local storage.');
      console.log('Sign in successful:', data);
      setIsLoggedIn(true);
      // Don't redirect, show wallet instead
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('https://tron-backend.vercel.app/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle non-OK responses (e.g., 400 Bad Request)
        throw new Error(data.message || 'Registration failed');
      }

      // *** Optional: If the backend returns a token immediately after signup, store it ***
      if (data.token) {
         localStorage.setItem('userToken', data.token);
         window.dispatchEvent(new Event('authChanged'));
      }
      
      // Success handling
      setMessage('Registration successful! User created.');
      console.log('Registration successful:', data);
      // Optionally switch to sign-in view after successful registration
      setIsSignInView(true);
      if (data.token) {
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If logged in, show wallet instead of login/register
  if (isLoggedIn) {
    return (
      <section className="account py-80">
        <div className="container container-lg">
          <Wallet />
        </div>
      </section>
    );
  }

  return (
    <section className="account py-80">
      <div className="container container-lg">
        {/* Toggle Buttons */}
        <div className="flex-align gap-16 mb-32">
          <button className={`btn ${isSignInView ? 'btn-main-two' : 'btn-outline-main-two'} py-18 px-40`} onClick={() => { setIsSignInView(true); setError(null); setMessage(null); }} > Sign In </button>
          <button className={`btn ${!isSignInView ? 'btn-main-two' : 'btn-outline-main-two'} py-18 px-40`} onClick={() => { setIsSignInView(false); setError(null); setMessage(null); }} > Register </button>
        </div>
        {/* Status Messages */}
        {loading && <div className="alert alert-info">Loading...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        {/* Conditional Rendering of Forms */}
        <form onSubmit={isSignInView ? handleSignInSubmit : handleRegisterSubmit}>
          <div className="row justify-content-center">
            {/* The column classes were adjusted to center one form */}
            <div className="col-xl-6">
              {isSignInView ? (
                /* Login Card Start */
                <div className="border border-gray-100 hover-border-main-two-600 transition-1 rounded-16 px-24 py-40 h-100">
                  <h6 className="text-xl mb-32">Login to Your Account</h6>
                  <div className="mb-24">
                    <label htmlFor="email" className="text-neutral-900 text-lg mb-8 fw-medium"> Email address <span className="text-main-two-600">*</span> </label>
                    <input type="email" className="common-input" id="email" placeholder="Enter Email Address" value={signInData.email} onChange={handleSignInChange} required />
                  </div>
                  <div className="mb-24">
                    <label htmlFor="password" className="text-neutral-900 text-lg mb-8 fw-medium"> Password <span className="text-main-two-600">*</span> </label>
                    <div className="position-relative">
                      <input type="password" className="common-input" id="password" placeholder="Enter Password" value={signInData.password} onChange={handleSignInChange} required />
                      {/* Toggle password visibility implementation can be added later */}
                      <span className="toggle-password position-absolute top-50 inset-inline-end-0 me-16 translate-middle-y cursor-pointer ph ph-eye-slash" />
                    </div>
                  </div>
                  <div className="mb-24 mt-48">
                    <div className="flex-align gap-48 flex-wrap">
                      <button type="submit" className="btn btn-main-two py-18 px-40" disabled={loading}> {loading ? 'Logging in...' : 'Log in'} </button>
                      <div className="form-check common-check">
                        <input className="form-check-input" type="checkbox" defaultValue="" id="remember" />
                        <label className="form-check-label flex-grow-1" htmlFor="remember"> Remember me </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-48">
                    <Link to="#" className="text-main-two-600 text-sm fw-semibold hover-text-decoration-underline" > Forgot your password? </Link>
                  </div>
                </div>
                /* Login Card End */
              ) : (
                /* Register Card Start */
                <div className="border border-gray-100 hover-border-main-two-600 transition-1 rounded-16 px-24 py-40">
                  <h6 className="text-xl mb-32">Create a New Account</h6>
                  <div className="mb-24">
                    <label htmlFor="name" className="text-neutral-900 text-lg mb-8 fw-medium"> Username / Name <span className="text-main-two-600">*</span> </label>
                    <input type="text" className="common-input" id="name" placeholder="Write a username" value={registerData.name} onChange={handleRegisterChange} required />
                  </div>
                  <div className="mb-24">
                    <label htmlFor="email" className="text-neutral-900 text-lg mb-8 fw-medium"> Email address <span className="text-main-two-600">*</span> </label>
                    <input type="email" className="common-input" id="email" placeholder="Enter Email Address" value={registerData.email} onChange={handleRegisterChange} required />
                  </div>
                  <div className="mb-24">
                    <label htmlFor="password" className="text-neutral-900 text-lg mb-8 fw-medium"> Password <span className="text-main-two-600">*</span> </label>
                    <div className="position-relative">
                      <input type="password" className="common-input" id="password" placeholder="Enter Password" value={registerData.password} onChange={handleRegisterChange} required />
                      {/* Toggle password visibility implementation can be added later */}
                      <span className="toggle-password position-absolute top-50 inset-inline-end-0 me-16 translate-middle-y cursor-pointer ph ph-eye-slash" />
                    </div>
                  </div>
                  <div className="my-48">
                    <p className="text-gray-500"> Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our <Link to="#" className="text-main-two-600 text-decoration-underline"> privacy policy </Link> . </p>
                  </div>
                  <div className="mt-48">
                    <button type="submit" className="btn btn-main-two py-18 px-40" disabled={loading}> {loading ? 'Registering...' : 'Register'} </button>
                  </div>
                </div>
                /* Register Card End */
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Account;
