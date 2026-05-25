inherit "/zone/null/eternal/magic/potioncode";

extra_create()
{
    set_look("white");
    set_value(200);
}

drink()
{

    if(THISP->query_fatigue() < 20)
	write("Yowie!  You needed that!\n");
    THISP->add_fatigue(THISP->query_max_fatigue());
    write("Your limbs course with energy!\n");
}
