import * as bcrypt from 'bcrypt';
export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10)
}
export const compirePassword = async (password: string, hashPassword: string) => {
    return await bcrypt.compare(password, hashPassword)
}
