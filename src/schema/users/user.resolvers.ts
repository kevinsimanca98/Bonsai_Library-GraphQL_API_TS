import { ApolloError } from "apollo-server";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { Arg, Authorized, Ctx, Field, Mutation, ObjectType, Resolver } from "type-graphql";
import { MyContext } from "../../context";
import { UserLoginInput, UserRegisterInput } from "./user.inputs";
import { User, UserModel, UserRole } from "./user.model";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

@Resolver(of => User)
export class UserResolver {
  @Mutation(returns => User)
  async signup(@Arg("userData") { username, email, password, passwordConfirm }: UserRegisterInput): Promise<User> {
    if (password !== passwordConfirm) throw new ApolloError("Passwords don't match")
    const newUser = new UserModel({
      username,
      email,
      hashedPassword: bcrypt.hashSync(password, 10),
      role: UserRole.VIEWER
    })
    return await newUser.save().catch(err => { throw err })
  }

  @Mutation(returns => AuthPayload)
  async login(@Arg("loginData") { email, password }: UserLoginInput): Promise<AuthPayload> {
    const userData = await UserModel.findOne({ email })
    if (!userData?.email) throw new ApolloError("E-mail address not registered")
    if (!bcrypt.compareSync(password, userData.hashedPassword)) throw new ApolloError("Wrong password")
    const token = jwt.sign({ email, role: userData.role }, ACCESS_TOKEN_SECRET)
    
    return { token }
  }

  @Authorized(UserRole.VIEWER, UserRole.EDITOR)
  @Mutation(returns => AuthPayload)
  async askForEditorRole(@Ctx() { getUserDataFromReq, req }: MyContext): Promise<AuthPayload> {
    try {
      const userData = getUserDataFromReq(req)
      if (userData.role === UserRole.EDITOR) throw new ApolloError("User already has the editor role")
      await UserModel.updateOne({ email: userData.email }, { role: UserRole.EDITOR })
      const token = jwt.sign({ ...userData, role: UserRole.EDITOR }, ACCESS_TOKEN_SECRET)
      return { token }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}

@ObjectType({ description: "Response with an Authentication token" })
export class AuthPayload {
  @Field()
  token: string
}
