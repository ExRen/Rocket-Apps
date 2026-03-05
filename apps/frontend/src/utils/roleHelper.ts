

export const roleLabels: Record<string, string> = {
    SUPER_USER: 'Super User',
    LEVEL_1: 'Sesper / Kadiv',
    LEVEL_2: 'Kabid',
    LEVEL_3: 'Staff',
};

export const getRoleLabel = (role: string) => roleLabels[role] || role;

export const getRoleColor = (role: string) => {
    switch (role) {
        case 'SUPER_USER': return 'red';
        case 'LEVEL_1': return 'gold';
        case 'LEVEL_2': return 'blue';
        case 'LEVEL_3': return 'green';
        default: return 'default';
    }
};
