import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Courtside — Your game is on.',description:'Find live sports across your subscriptions, with honest watch links and Home Assistant automation.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
