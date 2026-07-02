inherit NewWeaponCode;
inherit SpecialAttackCode;
void extra_create()
{
    set( "id", ({ "ornate knife", "knife" }) );
    set_short("an ornate knife");
    set_long(
      "The maker of this knife put an immense amount of detail into "
      "its beauty.  Scrollwork winds around the hilt, with tiny jewels set at "
      "intervals between the parallel paths.  It appears almost decorative, "
      "except that the blade draws blood at your touch.  As you look it over, you "
      "realize that this blade weighs almost nothing.");
    set_proficiency("knife");
    set_material("steel");
    set_damage_type("piercing");
    add_combat_message( ({"stab","stabs"}) );
    add_combat_message( ({"poke","pokes"}) );
    set_base_damage(7);
    set_damage_step(10);
    set_base_speed(20);
    set_speed_step(7);
    set_prof_mod(2.8);
    set_fatigue_cost(0);
    set_handed(1);
    set_value(90);
}

post_wield( object wielder )
{
    if( is_player( wielder ) )
        add_special_attack("bore", THISO, 15);
    return(1);
}
 
bore(object vic, object att)
{
    int dmg;
    string vicname, attname;
    vicname = vic->query_name();
    attname = att->query_name();
    dmg = 10 + random(10) + random(10) + random(10);
    tell_object(vic, attname+"'s knife whistles as " + subjective(att) +
      "thrusts it and bores a hole in you!\n");
    tell_object(att, "Your knife whistles as you thrust it and bore a " +
      "hole in " + vicname + "!\n");
    tell_room(ENV(vic), attname+"'s knife whistles as "+subjective(att) +
      "thrusts it and bores a hole in " + vicname + "!\n", ({ att, vic }) );
    vic->take_damage(dmg, 0, "piercing", att, att);
}
