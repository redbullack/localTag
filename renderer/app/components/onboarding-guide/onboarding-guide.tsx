'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ONBOARDING_SLIDES } from './onboarding-slides-data';
import './onboarding-guide.css';

interface OnboardingGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const totalSlides = ONBOARDING_SLIDES.length;
    const isLastSlide = currentSlide === totalSlides - 1;

    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
            setDirection('next');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && !isLastSlide) {
                goToSlide(currentSlide + 1, 'next');
            } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
                goToSlide(currentSlide - 1, 'prev');
            } else if (e.key === 'Escape') {
                handleClose();
            } else if (e.key === 'Enter' && isLastSlide) {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentSlide, isLastSlide]);

    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    const goToSlide = useCallback((index: number, dir: 'next' | 'prev') => {
        if (isAnimating || index < 0 || index >= totalSlides) return;
        setIsAnimating(true);
        setDirection(dir);
        setCurrentSlide(index);
        setTimeout(() => setIsAnimating(false), 300);
    }, [isAnimating, totalSlides]);

    const handleClose = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.setConfig({ key: 'hasSeenOnboarding', value: true });
        }
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const slide = ONBOARDING_SLIDES[currentSlide];

    return (
        <div className="onboarding-overlay">
            <div
                className="onboarding-modal"
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label="온보딩 가이드"
                tabIndex={-1}
            >
                <div className="onboarding-slide-container">
                    <div
                        key={currentSlide}
                        className={`onboarding-slide onboarding-slide--${direction}`}
                    >
                        <div className="onboarding-slide__icon">
                            {slide.icon}
                        </div>
                        <h2 className="onboarding-slide__title">{slide.title}</h2>
                        <div className="onboarding-slide__description">
                            {slide.description.split('\n').map((line, i) => (
                                <p key={i} className="onboarding-slide__line">{line.trim()}</p>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="onboarding-nav">
                    <button
                        className="onboarding-nav__skip"
                        onClick={handleClose}
                        type="button"
                        style={{ visibility: isLastSlide ? 'hidden' : 'visible' }}
                    >
                        건너뛰기
                    </button>

                    <div className="onboarding-dots">
                        {ONBOARDING_SLIDES.map((_, index) => (
                            <button
                                key={index}
                                className={`onboarding-dot${index === currentSlide ? ' onboarding-dot--active' : ''}`}
                                onClick={() => goToSlide(index, index > currentSlide ? 'next' : 'prev')}
                                type="button"
                                aria-label={`슬라이드 ${index + 1}`}
                            />
                        ))}
                    </div>

                    {isLastSlide ? (
                        <button
                            className="onboarding-nav__cta"
                            onClick={handleClose}
                            type="button"
                        >
                            시작하기
                        </button>
                    ) : (
                        <button
                            className="onboarding-nav__next"
                            onClick={() => goToSlide(currentSlide + 1, 'next')}
                            type="button"
                        >
                            다음
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    )}
                </div>

                {currentSlide > 0 && (
                    <button
                        className="onboarding-arrow onboarding-arrow--prev"
                        onClick={() => goToSlide(currentSlide - 1, 'prev')}
                        type="button"
                        aria-label="이전 슬라이드"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                )}
                {!isLastSlide && (
                    <button
                        className="onboarding-arrow onboarding-arrow--next"
                        onClick={() => goToSlide(currentSlide + 1, 'next')}
                        type="button"
                        aria-label="다음 슬라이드"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default OnboardingGuide;
