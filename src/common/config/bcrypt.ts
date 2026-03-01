import * as bcrypt from 'bcrypt';
export const hashPassword = async (password: string) => {
    const passwordHash = await bcrypt.hash(password, 10)
    return passwordHash
}
export const compirePassword = async (password: string, hashPassword: string) => {
    const isMatch = await bcrypt.compare(password, hashPassword)
    return isMatch ? true : false
}