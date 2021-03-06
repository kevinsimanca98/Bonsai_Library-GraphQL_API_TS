import { DocumentType } from "@typegoose/typegoose"
import { Arg, Args, Authorized, Ctx, FieldResolver, ID, Query, Resolver, Root } from "type-graphql"
import { MyContext } from "../../context"
import { PaginationArgs } from "../arg-types/paginationArgs"
import { Book } from "../books/book.model"
import { UserRole } from "../users/user.model"
import { Author, AuthorModel } from "./author.model"

@Resolver(of => Author)
export class AuthorResolver {
  @Authorized(UserRole.VIEWER, UserRole.EDITOR)
  @Query(returns => Author)
  async author(@Arg("id", type => ID) id: string): Promise<Author> {
    return await AuthorModel.findById(id)
  }

  @Authorized(UserRole.VIEWER, UserRole.EDITOR)
  @Query(returns => [Author])
  async authors(@Args() { page, amount }: PaginationArgs): Promise<Author[]> {
    const entriesToShow: number = amount
    const entriesToSkip: number = entriesToShow * (page - 1)

    return await AuthorModel
      .find()
      .limit(entriesToShow)
      .skip(entriesToSkip)
  }

  @FieldResolver()
  async books(
    @Root() authorDoc: DocumentType<Author>,
    @Ctx() { dataLoaders }: MyContext
  ): Promise<(Book|Error)[]> {
    try {
      const { bookIDs }: Author = authorDoc.toObject()
      const { bookLoader } = dataLoaders
      return await bookLoader.loadMany([...bookIDs])
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
