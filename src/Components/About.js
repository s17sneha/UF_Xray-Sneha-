import React from 'react'
import './CSS/about.css'
import dummyImg from './Imgs/dummy-img-male.png';
import dummyImgFemale from './Imgs/dummy-img-female.png';
export default function About() {
    return (
        <>
            <section className='relative overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black' />
                <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-white'>
                    <h1 className='text-4xl font-extrabold tracking-tight'>About Us</h1>
                    <p className='mt-4 max-w-3xl mx-auto text-lg text-white/80'>We are a team of cybersecurity enthusiasts focused on delivering precise, actionable malware and URL analysis with a strong emphasis on privacy and clarity.</p>
                </div>
            </section>

            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <div className='rounded-2xl border border-gray-200 bg-white p-6 shadow dark:bg-gray-900 dark:border-gray-800'>
                        <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>Mission</h3>
                        <p className='mt-2 text-gray-600 dark:text-gray-300'>Empower users to quickly detect threats and make informed security decisions with transparent, high-quality reports.</p>
                    </div>
                    <div className='rounded-2xl border border-gray-200 bg-white p-6 shadow dark:bg-gray-900 dark:border-gray-800'>
                        <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>Technology</h3>
                        <p className='mt-2 text-gray-600 dark:text-gray-300'>Combining static/dynamic analysis with ML heuristics to identify complex malware and phishing techniques.</p>
                    </div>
                    <div className='rounded-2xl border border-gray-200 bg-white p-6 shadow dark:bg-gray-900 dark:border-gray-800'>
                        <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>Values</h3>
                        <p className='mt-2 text-gray-600 dark:text-gray-300'>Privacy, clarity, and accuracy come first — every scan is designed to be trustworthy and understandable.</p>
                    </div>
                </div>
            </section>

            <section className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6'>Our Team</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                    {[{
                        name: 'Ashank', img: dummyImg, desc: 'B.Tech CSE (Cybersecurity). Interested in digital forensics and threat analysis.'
                    }, {
                        name: 'Sneha', img: dummyImgFemale, desc: 'B.Tech CSE (Cybersecurity). Passionate about networking and secure design.'
                    }, {
                        name: 'Nishant', img: dummyImg, desc: 'B.Tech CSE (Cybersecurity). Focused on secure web development and research.'
                    }, {
                        name: 'Vishal', img: dummyImg, desc: 'B.Tech CSE (Cybersecurity). Building modern, secure web experiences.'
                    }].map((m) => (
                        <div key={m.name} className='overflow-hidden rounded-2xl border border-gray-200 bg-white shadow dark:bg-gray-900 dark:border-gray-800'>
                            <img src={m.img} alt={m.name} className='h-44 w-full object-cover' />
                            <div className='p-4'>
                                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>{m.name}</h3>
                                <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>{m.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )
}
