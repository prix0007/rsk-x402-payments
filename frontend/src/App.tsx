import React from "react";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, Route, BrowserRouter, Routes } from "react-router-dom";
import { config } from './config'

import "./App.css";

const queryClient = new QueryClient()

// Pages
import ServiceDiscovery from "./pages/ServiceDiscovery";
import PaymentVerification from "./pages/PaymentVerification";
import ProtectedResource from "./pages/ProtectedResource";

function App() {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<div className="app root">
						<nav className="navbar">
							<div className="nav-brand">
								<h1>X402 Payments</h1>
							</div>
							<div className="nav-links">
								<Link to="/">Services</Link>
								<Link to="/payments">Payments</Link>
								<Link to="/protected">Protected</Link>
							</div>
						</nav>

						<main className="main-content">
							<Routes>
								<Route path="/" element={<ServiceDiscovery />} />
								<Route path="/payments" element={<PaymentVerification />} />
								<Route
									path="/protected/:serviceId/:resourceId"
									element={<ProtectedResource />}
								/>
							</Routes>
						</main>
					</div>
				</BrowserRouter>
			</QueryClientProvider>
		</WagmiProvider>
	);
}

export default App;
