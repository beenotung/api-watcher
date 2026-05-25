import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('watch_log'))) {
    await knex.schema.createTable('watch_log', table => {
      table.increments('id')
      table.integer('watch_schedule_id').unsigned().notNullable().references('watch_schedule.id')
      table.integer('poll_time').notNullable()
      table.text('error').nullable()
      table.integer('status_code').nullable()
      table.text('content_type').nullable()
      table.text('body').nullable()
      table.integer('version').nullable()
      table.boolean('is_new_version').notNullable()
      table.timestamps(false, true)
    })
  }
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('watch_log')
}
