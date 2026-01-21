import { useEffect, useState } from "react";

export default function History() {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/history")
            .then(res => res.json())
            .then(setData);
    }, []);

    return (
        <table>
            <thead>
                <tr>
                    <th>Loại xe</th>
                    <th>ID</th>
                    <th>Thời gian</th>
                </tr>
            </thead>
            <tbody>
                {data.map((r, i) => (
                    <tr key={i}>
                        <td>{r.type}</td>
                        <td>{r.track_id}</td>
                        <td>{r.time}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
