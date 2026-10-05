import { useSelector } from 'react-redux'
import type { RootState } from '../features/store/store'

const useCurrentOutlet = () => {
    const outlet = useSelector((state: RootState)=> state.outlet)
    const currentOutlet = outlet.currentOutlet
  return {

    outletId : currentOutlet?._id,
    outletCode : currentOutlet?.code,
    outletName : currentOutlet?.name,
  }
}

export default useCurrentOutlet