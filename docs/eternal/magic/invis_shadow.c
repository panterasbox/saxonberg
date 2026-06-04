object player;
int visibility;

i_check()
{
    if(player->in_combat() || random(visibility)>10)
	dest_shadow();
}

string short()
{
    i_check();
    return(0);
}

string query_name()
{
    i_check();
    return("Something");
}

int activate(object ob)
{
    player = THISP;
    shadow(player, 1);
    return(1);
}

countdown(int s)
{
    call_out( "dest_shadow", s );
}

int query_muffled_move()
{
    i_check();
    return 1;
}

dest_shadow()
{
    tell_object(THISP,"You feel a heaviness in your belly.\n");
    remove_shadow(THISO);
    destruct(THISO);
}

query_move_okay()
{
    visibility++;
}
