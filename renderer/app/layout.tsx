import { ConfirmProvider } from './components/shared/confirm-dialog';
import { ToastProvider } from './components/shared/toast-provider';
import './globals.css';

export const metadata = {
    title: 'LocalTag - Tag-based File Organizer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ToastProvider>
                    <ConfirmProvider>
                        {children}
                    </ConfirmProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
