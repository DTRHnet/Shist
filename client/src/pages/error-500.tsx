import React from 'react';

export default function Error500() {
	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="max-w-md w-full text-center">
				<h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
				<p className="text-muted-foreground mb-6">An unexpected error occurred. Please try again or return home.</p>
				<a href="/" className="inline-block px-4 py-2 bg-primary text-white rounded-md">Go Home</a>
			</div>
		</div>
	);
}