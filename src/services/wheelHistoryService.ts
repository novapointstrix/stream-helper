// src/services/wheelHistoryService.ts
import { supabase } from '../lib/supabaseClient'
import type { SpinRecord } from '../types/wheel.types'

export const wheelHistoryService = {
    /**
     * Загрузка последних прокрутов строго текущего пользователя
     */
    async getHistory(limit = 50): Promise<SpinRecord[]> {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return []

        const { data, error } = await supabase
            .from('wheel_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Ошибка загрузки истории колеса:', error)
            return []
        }

        return data || []
    },

    /**
     * Сохранение результата нового вращения
     */
    async addRecord(record: Omit<SpinRecord, 'id' | 'created_at'>): Promise<SpinRecord | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const payload = {
            ...record,
            user_id: user.id
        }

        const { data, error } = await supabase
            .from('wheel_history')
            .insert([payload])
            .select()
            .single()

        if (error) {
            console.error('Ошибка сохранения прокрута:', error)
            return null
        }

        return data
    },

    /**
     * Удаление записи текущего пользователя
     */
    async deleteRecord(id: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Ошибка удаления записи:', error)
            return false
        }

        return true
    }
}