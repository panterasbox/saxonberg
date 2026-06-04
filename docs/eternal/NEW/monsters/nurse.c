/*
**  Monster : nurse
**  Author  : Torenthal
*/

inherit MonsterCode;

void extra_create()
{
    object tmp;

    set_name("nurse");
    add_alias("woman");
    set_short("Recovery Room Nurse");
    set_long("The nurse is clothed in a close-fitting white uniform.  The uniform\n" +
        "has the insignia of a transporter on the breast pocket.  She is busy\n" +
        "looking after all of the equipment that serves to revitalise the\n" +
        "casualties of the time zones.\n");
    set_race("human");
    set_max_hp(10000);
    set_max_fatigue(10000);
    set_max_damage(25);
    set_hit_bonus(3);
    set_damage_bonus(3);
    set_type("syringe");
    set_natural_ac(25);
    set_offensive_level(50);
    set_defensive_level(50);
    set_alignment(1000);
    set_aggressive(0);
    set_heal_rate(20);
    set_heal_amount(10);
}
