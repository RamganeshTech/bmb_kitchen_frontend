// import { useMemo } from 'react';
// import { useAuthData } from './useAuthData'; // Adjust path
// import {  accountantMenu, teacherMenu, getParentMenu, getParentInitialMenu, baseManagementMenu } from '../constants/constants';


// export const useAuthorizedMenu = () => {
//     // 1. Pull the necessary context automatically
//     const { currentRole, organizationId } = useAuthData();

//     const { data } = useGetSchoolById(organizationId!)
//     const academicYear = data?.currentAcademicYear


//     // console.log("academicYear in auth menu", academicYear)
//     // const { studentId: activeStudentId } = useCurrentStudent();
//     const {
//         studentId: activeStudentId,
//         classId,
//         sectionId
//     } = useCurrentStudent();




//     // 2. Wrap the logic in useMemo so it only recalculates when role/id changes
//     const authorizedMenu = useMemo(() => {

//         // --- 1. Explicit Arrays for highly restricted roles ---

//         let menu = [...baseManagementMenu];


//         if (currentRole === 'parent') {
//             // Check if activeStudentId exists. If yes, full menu. If not, initial menu.
//             return activeStudentId
//                 ? getParentMenu({
//                     studentId: activeStudentId,
//                     classId: classId,
//                     sectionId: sectionId,
//                     academicYear: academicYear
//                 })
//                 : getParentInitialMenu();
//         }
//         else if (currentRole === "teacher") {
//             menu = [...teacherMenu];
//         }
//         else if (currentRole === "accountant") {
//             menu = [...accountantMenu];
//         }
//         else {
//             menu = [...principalMenu];

//             if (currentRole === "viceprincipal") {
//                 menu = [...vicePrincipalMenu];
//             }

//             if (
//                 currentRole !== "correspondent" ||
//                 organizationId !== "6942923ab194c60dc810cc6b"
//             ) {
//                 menu = menu.filter(item => item.name !== "School List");
//             }
//         }

//         // if (currentRole === 'teacher') return teacherMenu;
//         // if (currentRole === 'accountant') return accountantMenu;


//         // --- 2. Base list for powerful roles ---

//         // let menu = [...principalMenu];

//         // if (currentRole === "viceprincipal") {
//         //     let VPMenu = vicePrincipalMenu;
//         //     menu = VPMenu
//         // }

//         // // ONLY show 'School List' if BOTH conditions are met:
//         // // 1. User is a correspondent
//         // // 2. They belong to the master platform school ID
//         // if (currentRole !== 'correspondent' || organizationId !== '6942923ab194c60dc810cc6b') {
//         //     menu = menu.filter(item => item.name !== 'School List');
//         // }

//         // return menu;
//         return menu.sort((a, b) => a.name.localeCompare(b.name));
//     }, [currentRole, organizationId, activeStudentId]); // Recalculates if any of these 3 change

//     return authorizedMenu;
// };


import { useMemo } from 'react';
import { useAuthData } from './useAuthData'; // Adjust path
import { ownerMenu, adminMenu, ctoMenu, staffMenu } from '../constants/constants'; // Adjust path

export const useAuthorizedMenu = () => {
    // 1. Pull the necessary context automatically
    const { currentRole } = useAuthData();

    // 2. Wrap the logic in useMemo so it only recalculates when the role changes
    const authorizedMenu = useMemo(() => {
        let menu: any[] = [];

        console.log("Current Role from Redux:", currentRole);
        
        // Assign the correct menu based on the user's role
        switch (currentRole) {
            case 'owner':
                menu = [...ownerMenu];
                break;
            case 'admin':
                menu = [...adminMenu];
                break;
            case 'cto':
                menu = [...ctoMenu];
                break;
            case 'staff':
                menu = [...staffMenu];
                break;
            default:
                menu = []; // Fallback for unauthenticated or unknown roles
                break;
        }

        // Note: Alphabetical sorting is removed here because UI menus are usually 
        // better arranged by logical importance (e.g., Dashboard first, Settings last). 
        // If you strictly want alphabetical, you can chain: return menu.sort(...)
        
        return menu;
    }, [currentRole]);

    return authorizedMenu;
};