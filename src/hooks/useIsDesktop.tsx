import { useEffect, useState } from "react";

const useIsDesktop = () => {
    const query = '(min-width: 1024px)';
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    return isDesktop;
};


export default useIsDesktop