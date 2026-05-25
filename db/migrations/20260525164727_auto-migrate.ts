import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  await knex.raw('delete from endpoint')
  await knex.raw('alter table `endpoint` add column `min_interval` integer not null')
  await knex.raw('alter table `endpoint` add column `max_interval` integer not null')

  if (!(await knex.schema.hasTable('watch_schedule'))) {
    await knex.schema.createTable('watch_schedule', table => {
      table.increments('id')
      table.integer('endpoint_id').unsigned().notNullable().references('endpoint.id')
      table.integer('schedule_time').notNullable()
      table.integer('poll_time').notNullable()
      table.integer('delta_duration').notNullable()
      table.integer('expected_version').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('watch_log'))) {
    await knex.schema.createTable('watch_log', table => {
      table.increments('id')
      table.integer('watch_schedule_id').unsigned().notNullable().references('watch_schedule.id')
      table.integer('poll_time').notNullable()
      table.text('error').nullable()
      table.integer('status_code').nullable()
      table.text('content_type').nullable()
      table.text('body').nullable()
      table.integer('version').notNullable()
      table.timestamps(false, true)
    })
  }
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('watch_log')
  await knex.schema.dropTableIfExists('watch_schedule')
  await knex.raw('alter table `endpoint` drop column `max_interval`')
  await knex.raw('alter table `endpoint` drop column `min_interval`')
}
