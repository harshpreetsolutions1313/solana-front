import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletRedirect = () => {
  const navigate = useNavigate();
  const { connect, connected } = useWallet();

  useEffect(() => {
    const handleRedirect = async () => {
      // Check if Phantom is available (user returned from app)
      if (window.phantom?.solana?.isPhantom) {
        try {
          // Attempt to connect
          await connect();
          
          // Redirect to home after successful connection
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } catch (error) {
          console.error('Failed to connect after redirect:', error);
          // Still redirect to home even if connection fails
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } else {
        // If Phantom isn't available, redirect back to home
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    };

    handleRedirect();
  }, [connect, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          border: '3px solid #f3f4f6',
          borderTopColor: '#6366f1',
          animation: 'spin 1s linear infinite'
        }} />
        
        <h2 style={{ marginBottom: '12px', color: '#1f2937' }}>
          Connecting Wallet...
        </h2>
        
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Please wait while we connect your Phantom wallet
        </p>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default WalletRedirect;