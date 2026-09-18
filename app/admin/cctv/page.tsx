import "./cctv.css";

const cameras = [
  ["Camera 1", "Main Hall"],
  ["Camera 2", "Entrance"],
  ["Camera 3", "Dining Area"],
  ["Camera 4", "Parking"],
];

export default function CctvPage() {
  return <main className="cctvPage"><header><div><a href="/admin">← Admin Home</a><p>SS FOODS · Aishwarya Party Hall</p><h1>Aishwarya Party Hall – Live CCTV <span>●</span></h1></div><small>Staff-only viewing</small></header><section className="cameraGrid">{cameras.map(([label, area]) => <article key={label}><div className="cameraFeed"><span>Camera stream will appear here</span><b>● Offline setup</b></div><footer><strong>{label}</strong><span>{area}</span><button type="button">Full screen</button></footer></article>)}</section><footer className="status"><span>● Dahua DVR detected · awaiting connection details</span><span>Live updates will begin after setup</span></footer></main>;
}
