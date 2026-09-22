import { useLaunch } from '@tarojs/taro'
import './app.css'
import './readability.css'
import './compact.css'
import { initCloud } from './media'

export default function App({ children }) {
  useLaunch(initCloud)
  return children
}
