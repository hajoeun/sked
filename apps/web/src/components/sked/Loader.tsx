import styles from './Loader.module.css'

export function Loader() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className={styles.loader}></div>
    </div>
  )
}
