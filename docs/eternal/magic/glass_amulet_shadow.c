/* Glass amulet shadow */


object player, amulet;

set_up_effect(object parg, object aarg) 
{
    amulet = aarg;
    player=parg;
    shadow(player,1);
}

remove_effect() 
{
    unshadow();
    destruct(THISO);
}

DeathSequence(object killer, string cause)
{
    if (!amulet || !amulet->query_worn()) 
    {
	tell_object(player,"You feel a sense of loss.\n");
	player->DeathSequence(killer,cause);
	remove_effect();
	return;
    }
    save_my_life();
}

save_my_life()
{
    tell_room(environment(player),player->query_name() +
      "'s glass amulet shatters, releasing a red mist.\n"+
      player->query_name() + " is surrounded by a red glow!\n",({ player }));
    tell_object(player,"Just as you are about to die, your amulet "+
      "shatters!\n"+
      "You are surrounded by a red haze, and completely healed!\n");
    player->full_heal();
    amulet->shatter();
    return 1;
}

take_damage(int damage,int location,string type,object attacker,object w)
{
    string loc_name;

    if(player->query_hp() - damage < 1) 
    {
	if (!amulet || !amulet->query_worn()) 
	{
	    tell_object(player,"You feel a sense of loss.\n");
	    player->take_damage(damage,location,type,attacker,w);
	    remove_effect();
	    return;
	}
	loc_name = ( location  ? player->query_hit_info( "name",
	    location ) : 0 );
	if( !stringp( loc_name ) )
	    loc_name = "body";
	(SHARED_DIR + "gcm")->get_combat_message(player,damage,
	  loc_name,attacker);
	save_my_life();
	return 0;
    }
    player->take_damage(damage,location,type,attacker,w);
}
