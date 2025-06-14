import React, { useRef, useState, useEffect } from 'react';
import './css/LobbyNav.css';

interface Props{
  active : string;
  onNavigate : (key:string)=>void;
}

const SECTIONS = [
  { key:'rozgrywki', label:'Rozgrywki' },
  { key:'profil',    label:'Profil'    },
  { key:'sklep',     label:'Sklep'     },
  { key:'liderzy',   label:'Liderzy'   },
  { key:'ustawienia',label:'Ustawienia'},
];

const LobbyNav:React.FC<Props> = ({ active, onNavigate }) => {
  const barRef  = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<(HTMLButtonElement|null)[]>([]);
  const [barStyle,setBarStyle] = useState({ width:0, left:0 });

  const moveBar = () =>{
    const idx = SECTIONS.findIndex(s=>s.key===active);
    const btn = btnRefs.current[idx];
    if(!btn) return;
    const {offsetLeft:left,offsetWidth:width} = btn;
    setBarStyle({ width, left });
  };

  useEffect(()=>{
    moveBar();
    window.addEventListener('resize', moveBar);
    return ()=>window.removeEventListener('resize', moveBar);
  },[active]);

  return (
    <nav className="lobby-nav">
      {SECTIONS.map((s,i)=>(
        <button
          key={s.key}
          ref={el=>btnRefs.current[i]=el}
          onClick={()=>onNavigate(s.key)}
          className={`nav-btn ${active===s.key?'active':''}`}
        >
          {s.label}
        </button>
      ))}
      {/* przesuwana belka */}
      <span
        ref={barRef}
        className="nav-bar-indicator"
        style={{ width:barStyle.width, transform:`translateX(${barStyle.left}px)` }}
      />
    </nav>
  );
};

export default LobbyNav;
