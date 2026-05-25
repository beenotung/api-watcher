import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('endpoint'))) {
    await knex.schema.createTable('endpoint', table => {
      table.increments('id')
      table.text('title').notNullable()
      table.text('desc').notNullable()
      table.text('code').notNullable()
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.timestamps(false, true)
    })
  }
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('endpoint')
}
