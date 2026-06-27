import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Link } from "react-router-dom";
import logo from "../image/logo.png"
const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--nb-cream);
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    background: var(--nb-cream);
    top: -200px;
    right: -200px;
    animation: float 6s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    background: var(--nb-cream);
    bottom: -150px;
    left: -150px;
    animation: float 8s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-30px) rotate(10deg);
    }
  }
`;

const LoginWrapper = styled.div`
  display: flex;
  background: var(--nb-muted);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
  width: 100%;
  max-width: 450px;
  border: 1px solid var(--nb-border);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ImageSection = styled.div`
  flex: 1;
  background: linear-gradient(135deg, var(--nb-blue) 0%, var(--nb-orange) 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    top: -100px;
    right: -100px;
  }

  &::after {
    content: '';
    position: absolute;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    bottom: -50px;
    left: -50px;
  }

  @media (max-width: 768px) {
    padding: 20px;
    display: none;
  }
`;

const BrandSection = styled.div`
  text-align: center;
  z-index: 1;
  color: white;
`;

const LargeBrandName = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -1px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const LargeBrandTagline = styled.p`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 1rem 0 0 0;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const BrandDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 2rem 0 0 0;
  font-weight: 400;
  max-width: 350px;
  line-height: 1.6;
`;

const LoginFormSection = styled.div`
  flex: 1;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const FormTitle = styled.h2`
  color: var(--nb-ink);
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 600;
  font-size: 1.8rem;
  text-shadow: none;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const BrandName = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--nb-blue) 0%, var(--nb-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.5px;
  text-align: center;
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
  }
`;

const BrandTagline = styled.p`
  font-size: 0.85rem;
  color: var(--nb-ink);
  opacity: 0.7;
  margin: 0.5rem 0 0 0;
  text-align: center;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--nb-ink);
  font-size: 0.9rem;
  font-weight: 500;
`;

const InputField = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: var(--nb-muted);
  color: var(--nb-ink);

  &::placeholder {
    color: var(--nb-ink);
  }

  &:focus {
    border-color: var(--nb-orange);
    box-shadow: var(--nb-shadow-md);
    outline: none;
    background: var(--nb-muted);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.8rem;
  background: var(--nb-cream);
  color: var(--nb-blue);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  box-shadow: var(--nb-shadow-md);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
    background: var(--nb-cream);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--nb-muted);
    color: var(--nb-ink);
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--nb-shadow-md);
  }
`;

const ErrorMessage = styled.p`
  color: var(--nb-orange);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  background: var(--nb-muted);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--nb-orange);
`;

const FooterText = styled.p`
  text-align: center;
  margin-top: 2rem;
  color: var(--nb-ink);
  font-size: 0.8rem;

  a {
    color: var(--nb-orange);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
      color: var(--nb-ink);
    }
  }
`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:2500/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Dispatch custom event to notify App component
      window.dispatchEvent(new Event("userLogin"));

      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else if (res.data.user.role === "retailer") {
        navigate("/retailer");
      } else {
        navigate("/staff");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginWrapper>
        <LoginFormSection>
          <Logo>
            <img src={logo} alt="Logo" />
          </Logo>

          <FormTitle>Welcome Back</FormTitle>

          <form onSubmit={handleLogin}>
            <InputGroup>
              <InputLabel>Email Address</InputLabel>
              <InputField
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Password</InputLabel>
              <InputField
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </InputGroup>

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>{" "}
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </SubmitButton>

            {error && <ErrorMessage>{error}</ErrorMessage>}
          </form>

          <FooterText>
            Forgot your password? <a href="/forgot-password">Reset it here</a>
          </FooterText>
        </LoginFormSection>
      </LoginWrapper>
    </LoginContainer>
  );
};

export default Login;
