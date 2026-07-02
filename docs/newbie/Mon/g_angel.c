//  Genious: newbie/Mon/g_angel.c
//  Written by Hannah on 11/92.
//
//  94-05-05 Hannah -- Modified to use catch_tell instead of call_out in the
//                     following/fighting routines
//
//  This is a monster that follows a player of very good or higher alignment,
//  and which attacks monsters of evil alignment that the player is in
//  combat with.  It would be nice if it could end combat when target is
//  incapacitated.
//  The monster only hangs around for about 20 minutes.

inherit MonsterCode;
inherit MonsterTalk;
inherit SpecialAttackCode;

string Leader;
object Lead_ob;


void extra_create()
{
    string POS;

    if( !clonep() ) return;
    set_name( "angel" );
    add_alias( "guardian angel" );
    set_short( "a guardian angel" );
    set_long(
      "This is a guardian angel, protector of good people and other " +
      "beings.  The angel will fight by the side of a warrior of very " +
      "good alignment against an evil foe." );
    set_natural_ac( 1 );
    if( random( 2 ) )
    {
        set_gender( "male" );
        POS = "his";
    }
    else
    {
        set_gender( "female" );
        POS = "her";
    }
    set_race( "high_human" );
    set_alignment( ANGELIC_AL );
    set_heal_rate( 10 );
    set_heal_amount( 10 );
    set_type( "blunt" );
    set_stat( "str", 12 );
    set_stat( "int", 9 );
    set_stat( "wil", 10 );
    set_stat( "con", 14 );
    set_stat( "dex", 12 );
    set_stat( "chr", 14 );
    add_combat_message( "zap", "zaps" );
    set_chat_chance( 40 );
    set_chat_rate( 32 );
    add_phrase( "The guardian angel brushes off " + POS + " wings." );
    add_phrase( "The guardian angel adjusts " + POS + " halo." );
    add_combat_phrase( "The guardian angel briefly glows with power." );
    set_mercy( 1 );
    enable_commands();
    Leader = "nobody";
    add_special_attack( "light_attack", THISO, 20 );
}


void light_attack( object target, object attacker )
{
    tell_room( ENV( attacker ),
      "The guardian angel summons a giant ball of light!\n" );
    tell_room( ENV( attacker ),
      sprintf( "A sudden flash of light hits %s!\n", target->query_name() ),
      ({ target }) ); 
    tell_object( target, "A sudden flash of light hits you!\n" );
    target->take_damage( 5 + random( 5 ), 0, "holy", attacker );
}


void timeout_angel(  )
{
    tell_room( ENV( Lead_ob ),
      "The guardian angel says: My time in this world is done.\n"+
      "The guardian angel looks up to the heavens and flies home.\n" );
    remove_call_out( "setup_angel" );
    remove_call_out( "self_destruct" );
    destruct( THISO );
}


void setup_angel()
{
    say( sprintf( "The guardian angel is now following %s.\n",  Leader ),
         Lead_ob );
    write( "The guardian angel is now following you.\n" );
}


void extra_init()
{
    if( THISP->is_player() && ( Leader == "nobody" ) &&
      ( THISP->query_alignment() > GOOD_AL ) )
    {
        Leader = PNAME;
        Lead_ob = FINDP( PRNAME );
        THISO->set_short( Leader + "'s guardian angel" );
        call_out( "setup_angel", 1 );
        call_out( "timeout_angel", 300 );
    }
}


void move_me( object This_ob )
{
    tell_room( ENV( This_ob ),
      sprintf( "The guardian angel leaves, following %s.\n", Leader ) );
    move_object( This_ob, ENV( Lead_ob ) );
    tell_room( ENV( This_ob ),
      sprintf( "A guardian angel arrives, following %s.\n", Leader ),
      ({ Lead_ob }) );
    tell_object( Lead_ob, "The guardian angel arrives, following you.\n" );
}


void heart_beat()
{
    string  str1, str2, str3;
    mixed  *list;
    int     i;

    ::heart_beat();
    if( Leader == "nobody" )  return;
    if( !Lead_ob )
    {
        //  For some reason, this person isn't around anymore.  Did they
        //  quit or something?  In any case, bail out and leave.
        say( "The guardian angel flies up into the heavens.\n" );
        destruct( THISO );
        return;
    }
    if( ENV( THISO ) != ENV( Lead_ob ) )
        //  This player has left the room.  Go get 'em.
        call_out( "move_me", 2, THISO );

    // -----------------------------------------------------------------------
    //  This is the routine to make the Angel attack a monster when the player
    //  being followed is in combat.  The Angel will only attack monsters of
    //  evil alignment.

    if( !THISO->in_combat() && Lead_ob->in_combat() )
    {
        // Player combat targ list
        list = filter_array( Lead_ob->query_targets(), #'query_npc );
        for( i = 0; i < sizeof( list ); i++ )
        {
            if( list[ i ]->query_alignment() > EVIL_AL )
                continue;
            THISO->attack_object( list[ i ] );
            break;
        }
    }
    return;
}
