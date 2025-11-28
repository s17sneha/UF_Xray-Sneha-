import React, { useState } from 'react';
import contactImg from './Imgs/Contact_us.jpg';
import './CSS/contact.css'
import { api } from '../utils/api';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        desc: '',
        website: '' // honeypot (should stay empty)
    });
    const [status, setStatus] = useState({ loading: false, ok: false, error: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, ok: false, error: '' });
        // Basic client-side validation
        const name = formData.name.trim();
        const email = formData.email.trim();
        const phone = formData.phone.trim();
        const desc = formData.desc.trim();
        if (!name || !email || !desc) {
            setStatus({ loading: false, ok: false, error: 'Please provide name, email and message.' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus({ loading: false, ok: false, error: 'Please enter a valid email address.' });
            return;
        }
        try {
            await api.post('/api/contact', {
                name: name.slice(0, 120),
                email: email.slice(0, 200),
                phone: phone.slice(0, 40),
                desc: desc.slice(0, 4000),
                website: formData.website || '' // honeypot
            });
            setStatus({ loading: false, ok: true, error: '' });
            setFormData({ name: '', email: '', phone: '', desc: '', website: '' });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to send message';
            setStatus({ loading: false, ok: false, error: msg });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Image Section */}
                <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow dark:bg-gray-900 dark:border-gray-800">
                    <img src={contactImg} alt="Contact" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                {/* Contact Form */}
                <div className="w-full p-6 rounded-2xl border border-gray-200 bg-white shadow dark:bg-gray-900 dark:border-gray-800">
                    <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Get in Touch</h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">We'd love to hear from you. Fill out the form and we'll get back to you.</p>
                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                        {/* Honeypot field (hidden) */}
                        <input type="text" name="website" value={formData.website} onChange={handleChange} className="hidden" autoComplete="off" tabIndex="-1" />
                        <div>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full name"
                                className="w-full px-4 py-3 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                maxLength={120}
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                className="w-full px-4 py-3 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                maxLength={200}
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Phone"
                                className="w-full px-4 py-3 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                maxLength={40}
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <textarea
                                name="desc"
                                placeholder="Message"
                                className="w-full px-4 py-3 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none h-32 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                maxLength={4000}
                                required
                                value={formData.desc}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="submit" disabled={status.loading} className="inline-flex items-center rounded-md bg-blue-600 text-white px-5 py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
                                {status.loading ? 'Sending…' : 'Submit'}
                            </button>
                            {status.ok && <span className="text-sm text-green-700">Message sent successfully.</span>}
                            {status.error && <span className="text-sm text-red-700">{status.error}</span>}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}