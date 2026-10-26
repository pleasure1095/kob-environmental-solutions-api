const rentalItemsWellFormatted = (rentalItems: any) => {
    const refs = [
        {
            key: '_id',
            type: 'string'     //string
        },
        {
            key: 'count',
            type: 'posNumber'
        }
    ];

    let errStr = '';
    let itr = 0;

    for (const item of rentalItems) {

        for (const ref of refs) {

            let keyMissing = false;
            if (!item[ref.key]) {
                errStr += (errStr === '' ? `For value` : `; for value`) + ` at index, ${itr} missing "${ref.key}" key`;
                keyMissing = true;
            }

            if (!keyMissing) {
                let hasTypeErr = false;
                switch (ref.type) {
                    case 'string':
                        if (typeof item[ref.key] !== typeof 'String') {
                            hasTypeErr = true;
                        }
                        break;
                    case 'posNumber':
                        const isNotNumber = (value: any) => !/^-?\d+$/.test(value);
                        if (isNotNumber(item[ref.key] || item[ref.key])) {
                            hasTypeErr = true;
                        }
                        break;
                    default:
                        break;
                }

                if (hasTypeErr) {
                    errStr += (errStr === '' ? `For value` : `; for value`) + ` at index ${itr}, ${ref.type} if expected for key "${ref.key}"`;
                }
            }
        }

        itr++;
    }

    if (errStr !== '') {
        throw new Error(errStr);
    }

    return true;
}

export default rentalItemsWellFormatted;