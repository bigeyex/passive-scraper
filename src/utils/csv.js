export function exportToCSV(tableName, data, columns) {
    if (!data || data.length === 0) {
        return false;
    }

    const headers = columns.map(c => c.name);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = columns.map(col => {
            let val = row[col.name] || '';
            // Escape quotes and wrap in quotes if necessary
            if (typeof val === 'string') {
                val = val.replace(/"/g, '""');
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val}"`;
                }
            }
            return val;
        });
        csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
}
