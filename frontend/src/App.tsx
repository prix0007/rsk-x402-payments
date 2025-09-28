import React from "react";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, HashRouter, Routes } from "react-router-dom";
import { config } from './config'

import "./App.css";

const queryClient = new QueryClient()

// Pages
import ServiceDiscovery from "./pages/ServiceDiscovery";
import PaymentVerification from "./pages/PaymentVerification";
import ProtectedResource from "./pages/ProtectedResource";
import ServiceManagement from "./pages/ServiceManagement";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";

function App() {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<HashRouter>
					<div className="min-h-screen bg-gray-50">
						<Navbar />

						<main className="container mx-auto px-4 py-8">
							<Routes>
								<Route path="/" element={<ServiceDiscovery />} />
								<Route path="/dashboard" element={<Dashboard />} />
								<Route path="/payments" element={<PaymentVerification />} />
								<Route path="/manage" element={<ServiceManagement />} />
								<Route
									path="/protected/:serviceId/:resourceId"
									element={<ProtectedResource />}
								/>
							</Routes>
						</main>
					</div>
				</HashRouter>
			</QueryClientProvider>
		</WagmiProvider>
	);
}

export default App;
