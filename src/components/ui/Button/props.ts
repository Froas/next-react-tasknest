export interface IButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'ghost' | 'destructive' | 'secondary' | 'primary' | 'outline' | 'link'
  size?: 'small' | 'medium' | 'large' | 'default' | 'icon'
  disabled?: boolean
  label?: string
}
