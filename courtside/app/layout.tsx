import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Courtside — Your game is on.',description:'Find live sports across your subscriptions, with honest watch links and Home Assistant automation.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Courtside',statusBarStyle:'black-translucent'},icons:{icon:'/favicon.svg',apple:'/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#101311'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
