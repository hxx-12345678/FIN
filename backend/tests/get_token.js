const login = async () => {
    try {
        const res = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'cptjacksprw@gmail.com', password: 'Player@123' })
        });
        const d = await res.json();

        // Auth service returns { token, orgId, user: { ... } }
        const token = d.token;
        const orgId = d.orgId || (d.user && d.user.orgRoles && d.user.orgRoles[0] && d.user.orgRoles[0].orgId);

        if (token && orgId) {
            console.log(`${token} ${orgId}`);
        } else {
            console.error('Login failed visibility:', JSON.stringify(d));
            process.exit(1);
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
        process.exit(1);
    }
};
login();
