import React,{useState} from 'react';
import {Dialog,Icon,IconButton} from './ui.jsx';

export default function MobileNavigation({onGo,onOpen}){
 const[expanded,setExpanded]=useState(false);
 const navigate=id=>{setExpanded(false);onGo(id);};
 return <><IconButton className="icon-button mobile-menu-toggle" name="menu" label="Open navigation" aria-expanded={expanded} onClick={()=>setExpanded(true)}/>{expanded&&<Dialog title="Explore the atelier" eyebrow="LUMI'S LITTLE WORLD" onClose={()=>setExpanded(false)}><div className="mobile-nav-links" role="navigation" aria-label="Mobile navigation"><button onClick={()=>navigate('inventions')}><Icon name="book"/><span>The collections<small>Open a lookbook</small></span><Icon name="arrow"/></button><button onClick={()=>navigate('story')}><Icon name="moon"/><span>Her story<small>From an attic to an atelier</small></span><Icon name="arrow"/></button><button onClick={()=>navigate('pinboard')}><Icon name="heart"/><span>Your pinboard<small>Keep your favourite looks</small></span><Icon name="arrow"/></button><button onClick={()=>{setExpanded(false);onOpen('guestbook');}}><Icon name="mail"/><span>Say hello<small>Leave a studio note</small></span><Icon name="arrow"/></button></div></Dialog>}</>;
}
