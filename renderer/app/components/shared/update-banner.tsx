'use client';

import type { AutoUpdateState } from '../../utils/use-auto-update';
import './update-banner.css';

interface UpdateBannerProps extends AutoUpdateState {}

export default function UpdateBanner({
    status,
    version,
    downloadPercent,
    errorMessage,
    startDownload,
    startInstall,
    recheckUpdate,
    dismiss,
}: UpdateBannerProps) {
    if (status === 'idle' || status === 'checking' || status === 'up-to-date') {
        return null;
    }

    return (
        <div className={`update-banner update-banner--${status}`}>
            <div className="update-banner__content">
                {status === 'available' && (
                    <>
                        <span className="update-banner__icon">🔔</span>
                        <span className="update-banner__message">
                            새 버전 <strong>v{version}</strong>이 있습니다.
                        </span>
                        <div className="update-banner__actions">
                            <button className="update-banner__btn update-banner__btn--primary" onClick={startDownload}>
                                다운로드
                            </button>
                            <button className="update-banner__btn update-banner__btn--dismiss" onClick={dismiss}>
                                나중에
                            </button>
                        </div>
                    </>
                )}

                {status === 'downloading' && (
                    <>
                        <span className="update-banner__icon">⬇️</span>
                        <span className="update-banner__message">
                            다운로드 중... {Math.round(downloadPercent)}%
                        </span>
                        <div className="update-banner__progress-track">
                            <div
                                className="update-banner__progress-fill"
                                style={{ width: `${downloadPercent}%` }}
                            />
                        </div>
                    </>
                )}

                {status === 'downloaded' && (
                    <>
                        <span className="update-banner__icon">✅</span>
                        <span className="update-banner__message">
                            <strong>v{version}</strong> 업데이트 준비 완료
                        </span>
                        <div className="update-banner__actions">
                            <button className="update-banner__btn update-banner__btn--primary" onClick={startInstall}>
                                지금 설치
                            </button>
                            <button className="update-banner__btn update-banner__btn--dismiss" onClick={dismiss}>
                                나중에
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <span className="update-banner__icon">⚠️</span>
                        <span className="update-banner__message">
                            업데이트 확인 실패{errorMessage ? `: ${errorMessage}` : ''}
                        </span>
                        <div className="update-banner__actions">
                            <button className="update-banner__btn update-banner__btn--primary" onClick={recheckUpdate}>
                                다시 시도
                            </button>
                            <button className="update-banner__btn update-banner__btn--dismiss" onClick={dismiss}>
                                닫기
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
