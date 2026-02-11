export interface Student {
    id: string;
    name: string;
}

export interface ClassData {
    id: string;
    name: string;
    students: Student[];
}

export const DUMMY_CLASSES: ClassData[] = [
    {
        id: 'c1',
        name: 'Computer Science - A',
        students: [
            { id: 's1', name: 'Alice Smith' },
            { id: 's2', name: 'Bob Johnson' },
            { id: 's3', name: 'Charlie Brown' },
            { id: 's4', name: 'David Wilson' },
        ],
    },
    {
        id: 'c2',
        name: 'Mathematics - B',
        students: [
            { id: 's5', name: 'Eve Adams' },
            { id: 's6', name: 'Frank Miller' },
            { id: 's7', name: 'Grace Taylor' },
        ],
    },
    {
        id: 'c3',
        name: 'Physics Lab',
        students: [
            { id: 's8', name: 'Henry Ford' },
            { id: 's9', name: 'Ivy League' },
        ],
    },
];
