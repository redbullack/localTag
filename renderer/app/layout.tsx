import { ConfirmProvider } from './components/shared/confirm-dialog';
import { ThemeProvider } from './components/shared/theme-provider';
import { ToastProvider } from './components/shared/toast-provider';
import './globals.css';

const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem('theme');var r;if(t==='dark'||t==='light'){r=t}else{r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',r);})()`;

export const metadata = {
    title: 'LocalTag - Tag-based File Organizer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body>
                <ThemeProvider>
                    <ToastProvider>
                        <ConfirmProvider>
                            {children}
                        </ConfirmProvider>
                    </ToastProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
