import React, { useMemo } from "react";
import { useServices } from "../utils/API";
import USDRIFBalanceButton from "../components/USDRIFBalanceButton";
import ServiceCard from "../components/ServiceCard";

const ServiceDiscovery: React.FC = () => {
	const { isLoading: loading, error, data } = useServices()

	const services = useMemo(() => {
		return data?.data
	}, [data])

	const handleAccessService = (serviceId: string) => {
		window.location.href = `/protected/${serviceId}/resource1`;
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<div className="loading loading-spinner loading-lg text-primary"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="alert alert-error max-w-lg mx-auto">
				<svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Error: {error?.name}: {error?.message}</span>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 flex flex-col gap-3">
			<div className="mb-8">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-4xl font-bold text-gray-900 mb-2">Available Services</h1>
						<p className="text-gray-600">Discover and access X402 payment-enabled services</p>
					</div>
					<USDRIFBalanceButton className="mt-2" />
				</div>
			</div>

			{!services || services.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-gray-500 text-lg">No services available at the moment</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{services.map((service) => (
						<ServiceCard
							key={service.id}
							service={service}
							onAccessService={handleAccessService}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default ServiceDiscovery;
